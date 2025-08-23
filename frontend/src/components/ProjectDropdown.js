import React, { useState, useEffect } from 'react';
import { Form } from 'react-bootstrap';

const ProjectDropdown = ({ selectedProject, setSelectedProject }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };
        const res = await fetch('http://localhost:8000/api/admin/projects', { headers });
        if (res.ok) {
          const data = await res.json();
          setProjects(data.projects || []);
          if (data.projects && data.projects.length > 0) {
            setSelectedProject(data.projects[0]);
          }
        } else {
          setProjects([]);
        }
      } catch (err) {
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
    // eslint-disable-next-line
  }, []);

  return (
    <Form.Group className="mb-3" controlId="projectDropdown">
      <Form.Label>Select Project</Form.Label>
      <Form.Select
        value={selectedProject?.id || ''}
        onChange={e => {
          const proj = projects.find(p => p.id === e.target.value);
          setSelectedProject(proj);
        }}
        disabled={loading || projects.length === 0}
      >
        {projects.map(project => (
          <option key={project.id} value={project.id}>{project.name}</option>
        ))}
      </Form.Select>
    </Form.Group>
  );
};

export default ProjectDropdown;
